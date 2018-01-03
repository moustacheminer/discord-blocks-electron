/* eslint-disable import/no-dynamic-require */
const js2xmlparser = require('js2xmlparser');
const fs = require('fs');

const version = '11.2.0';
const colour = {
	construct: 160,
	prop: 230,
	method: 40,
	event: 100
};
const header = `/* global Blockly */
/*
	MIT License

	Copyright (c) 2018 Moustacheminer Server Services

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/`;

const docs = require(`./discordjs/${version}.json`);
const url = 'https://discord.js.org/#/docs/main/stable/';
let code = header;

const xml = {
	category: []
};

const escapeTooltip = string => (string || '').replace(/\n/g, '\\n').replace(/'/g, '\\\'');

// c for class
docs.classes.forEach((c) => {
	// Pollute the useless space!
	const temp = {};
	if (c.access !== 'private') {
		const currclass = {
			'@': {
				name: c.name
			},
			'#': '',
			block: []
		};

		// Constructor
		if (c.construct) {
			temp.with = '';
			temp.blockInputs = '';
			temp.codeInputs = '';
			temp.codeAttributes = '';
			temp.params = c.construct.params.filter(current => !current.name.includes('.'));

			if (temp.params.length) {
				// Add the word "with" for the block
				temp.with = ' with ';
				temp.params.forEach((parameter) => {
					// Inputs for the block definition
					temp.blockInputs += `
		this.appendValueInput('${parameter.name}')
			.setCheck(null);`;

					// Inputs for the code generator
					temp.codeInputs += `
	const ${parameter.name} = Blockly.JavaScript.valueToCode(block, '${parameter.name}', Blockly.JavaScript.ORDER_ATOMIC);`;
				});
				temp.codeAttributes = temp.params.map(parameter => `\${${parameter.name}}`).join();
			}
			code += `
Blockly.Blocks.${c.name}_constructor = {
	init() {
		this.appendDummyInput()
			.appendField('Create a new ${c.name}${temp.with}');${temp.blockInputs}
		this.setInputsInline(true);
		this.setOutput(true, null);
		this.setColour(${colour.construct});
		this.setTooltip('${escapeTooltip(c.description)}');
		this.setHelpUrl('${url}class/${c.name}');
	}
};

Blockly.JavaScript.${c.name}_constructor = (block) => {${temp.codeInputs}
	const code = \`new Discord.${c.name}(${temp.codeAttributes})\`;
	return [code, Blockly.JavaScript.ORDER_NONE];
};
`;
			currclass.block.push({
				'@': {
					type: `${c.name}_constructor`
				},
				'#': ''
			});
		}

		// Properties
		if (c.props) {
			c.props.filter(property => property.access !== 'private')
				.forEach((property) => {
					code += `
Blockly.Blocks.${c.name}_${property.name} = {
	init() {
		this.appendValueInput('${c.name}')
			.setCheck(null)
			.appendField('obtain ${property.name} of');
		this.setInputsInline(true);
		this.setOutput(true, null);
		this.setColour(${colour.prop});
		this.setTooltip('${escapeTooltip(property.description)}');
		this.setHelpUrl('${url}class/${c.name}?scrollTo=${property.name}');
	}
};

Blockly.JavaScript.${c.name}_${property.name} = (block) => {
	const ${c.name} = Blockly.JavaScript.valueToCode(block, '${c.name}', Blockly.JavaScript.ORDER_ATOMIC);
	const code = \`\${${c.name}}.${property.name}\`;
	return [code, Blockly.JavaScript.ORDER_NONE];
};
`;
					currclass.block.push({
						'@': {
							type: `${c.name}_${property.name}`
						},
						'#': ''
					});
				});
		}

		// Methods
		if (c.methods) {
			c.methods.filter(property => property.access !== 'private')
				.forEach((method) => {
					temp.blockReturn = `
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);`;
					temp.codeReturn = 'code';
					temp.codeNewLine = ';\\n';
					temp.with = '';
					temp.blockInputs = '';
					temp.codeInputs = '';
					temp.codeAttributes = '';
					temp.params = method.params ? method.params.filter(current => !current.name.includes('.')) : [];

					if (method.returns) {
						temp.returnoutput = method.returns.types || method.returns;
						if (temp.returnoutput[0][0][0] !== 'Promise') {
							temp.blockReturn = `
		this.setOutput(true, null);`;
							temp.codeReturn = '[code, Blockly.JavaScript.ORDER_NONE]';
							temp.codeNewLine = '';
						}
					}

					if (temp.params.length) {
						// Add the word "with" for the block
						temp.with = ' with';
						temp.params.forEach((parameter) => {
							// Inputs for the block definition
							temp.blockInputs += `
		this.appendValueInput('${parameter.name}')
			.setCheck(null);`;

							// Inputs for the code generator
							temp.codeInputs += `
	const ${parameter.name} = Blockly.JavaScript.valueToCode(block, '${parameter.name}', Blockly.JavaScript.ORDER_ATOMIC);`;
						});
						temp.codeAttributes = temp.params.map(parameter => `\${${parameter.name}}`).join();
					}

					code += `
Blockly.Blocks.${c.name}_${method.name} = {<html><head>
	<title>DiscordBlocks</title>
	<script src="js/workspace.js" defer=""></script>
	<link rel="stylesheet" href="css/app.css">
</head>

<body>
	<div class="tab block" id="block"></div>
	<div class="tab code">
		<pre><code id="code" class="lang-js"></code></pre>
	</div>
	<div class="hidden">
		<xml id="toolbox">
			<category name="Logic">
				<category name="If">
					<block type="controls_if"></block>
					<block type="controls_if">
						<mutation else="1"></mutation>
					</block>
					<block type="controls_if">
						<mutation elseif="1" else="1"></mutation>
					</block>
				</category>
				<category name="Boolean">
					<block type="logic_compare"></block>
					<block type="logic_operation"></block>
					<block type="logic_negate"></block>
					<block type="logic_boolean"></block>
					<block type="logic_null"></block>
					<block type="logic_ternary"></block>
				</category>
			</category>
			<category name="Loops">
				<block type="controls_repeat_ext">
					<value name="TIMES">
						<block type="math_number">
							<field name="NUM">10</field>
						</block>
					</value>
				</block>
				<block type="controls_whileUntil"></block>
				<block type="controls_for">
					<field name="VAR">i</field>
					<value name="FROM">
						<block type="math_number">
							<field name="NUM">1</field>
						</block>
					</value>
					<value name="TO">
						<block type="math_number">
							<field name="NUM">10</field>
						</block>
					</value>
					<value name="BY">
						<block type="math_number">
							<field name="NUM">1</field>
						</block>
					</value>
				</block>
				<block type="controls_forEach"></block>
				<block type="controls_flow_statements"></block>
			</category>
			<category name="Mathematics">
				<block type="math_number"></block>
				<block type="math_arithmetic"></block>
				<block type="math_single"></block>
				<block type="math_trig"></block>
				<block type="math_constant"></block>
				<block type="math_number_property"></block>
				<block type="math_round"></block>
				<block type="math_on_list"></block>
				<block type="math_modulo"></block>
				<block type="math_constrain">
					<value name="LOW">
						<block type="math_number">
							<field name="NUM">1</field>
						</block>
					</value>
					<value name="HIGH">
						<block type="math_number">
							<field name="NUM">100</field>
						</block>
					</value>
				</block>
				<block type="math_random_int">
					<value name="FROM">
						<block type="math_number">
							<field name="NUM">1</field>
						</block>
					</value>
					<value name="TO">
						<block type="math_number">
							<field name="NUM">100</field>
						</block>
					</value>
				</block>
				<block type="math_random_float"></block>
			</category>
			<category name="Arrays">
				<block type="lists_create_with">
					<mutation items="0"></mutation>
				</block>
				<block type="lists_create_with"></block>
				<block type="lists_repeat">
					<value name="NUM">
						<shadow type="math_number">
							<field name="NUM">5</field>
						</shadow>
					</value>
				</block>
				<block type="lists_length"></block>
				<block type="lists_isEmpty"></block>
				<block type="lists_indexOf">
					<value name="VALUE">
						<block type="variables_get">
							<field name="VAR">{listVariable}</field>
						</block>
					</value>
				</block>
				<block type="lists_getIndex">
					<value name="VALUE">
						<block type="variables_get">
							<field name="VAR">{listVariable}</field>
						</block>
					</value>
				</block>
				<block type="lists_setIndex">
					<value name="LIST">
						<block type="variables_get">
							<field name="VAR">{listVariable}</field>
						</block>
					</value>
				</block>
				<block type="lists_getSublist">
					<value name="LIST">
						<block type="variables_get">
							<field name="VAR">{listVariable}</field>
						</block>
					</value>
				</block>
				<block type="lists_split">
					<value name="DELIM">
						<shadow type="text">
							<field name="TEXT">,</field>
						</shadow>
					</value>
				</block>
				<block type="lists_sort"></block>
			</category>
			<category name="Strings">
				<block type="text"></block>
				<block type="text_join"></block>
				<block type="text_append">
					<value name="TEXT">
						<shadow type="text"></shadow>
					</value>
				</block>
				<block type="text_length">
					<value name="VALUE">
						<shadow type="text">
							<field name="TEXT">abc</field>
						</shadow>
					</value>
				</block>
				<block type="text_isEmpty">
					<value name="VALUE">
						<shadow type="text">
							<field name="TEXT"></field>
						</shadow>
					</value>
				</block>
				<block type="text_indexOf">
					<value name="VALUE">
						<block type="variables_get">
							<field name="VAR">{textVariable}</field>
						</block>
					</value>
					<value name="FIND">
						<shadow type="text">
							<field name="TEXT">abc</field>
						</shadow>
					</value>
				</block>
				<block type="text_charAt">
					<value name="VALUE">
						<block type="variables_get">
							<field name="VAR">{textVariable}</field>
						</block>
					</value>
				</block>
				<block type="text_getSubstring">
					<value name="STRING">
						<block type="variables_get">
							<field name="VAR">{textVariable}</field>
						</block>
					</value>
				</block>
				<block type="text_changeCase">
					<value name="TEXT">
						<shadow type="text">
							<field name="TEXT">abc</field>
						</shadow>
					</value>
				</block>
				<block type="text_trim">
					<value name="TEXT">
						<shadow type="text">
							<field name="TEXT">abc</field>
						</shadow>
					</value>
				</block>
				<block type="console_log">
					<value name="text">
						<shadow type="text">
							<field name="TEXT">abc</field>
						</shadow>
					</value>
				</block>
				<block type="text_print">
					<value name="TEXT">
						<shadow type="text">
							<field name="TEXT">abc</field>
						</shadow>
					</value>
				</block>
				<block type="text_prompt_ext">
					<value name="TEXT">
						<shadow type="text">
							<field name="TEXT">abc</field>
						</shadow>
					</value>
				</block>
			</category>
			<category name="Variables" custom="VARIABLE"></category>
			<category name="Functions" custom="PROCEDURE"></category>
			<category name="Javascript">
				<block type="eval"></block>
				<block type="mss_object"></block>
				<block type="mss_object_set"></block>
				<block type="mss_property_get"></block>
				<block type="mss_json_stringify"></block>
				<block type="mss_json_parse"></block>
			</category>
			<sep></sep>
			<category name="Client">

				<block type="Client_constructor"></block>
				<block type="Client_options"></block>
				<block type="Client_shard"></block>
				<block type="Client_users"></block>
				<block type="Client_guilds"></block>
				<block type="Client_channels"></block>
				<block type="Client_presences"></block>
				<block type="Client_token"></block>
				<block type="Client_user"></block>
				<block type="Client_readyAt"></block>
				<block type="Client_broadcasts"></block>
				<block type="Client_pings"></block>
				<block type="Client_status"></block>
				<block type="Client_uptime"></block>
				<block type="Client_ping"></block>
				<block type="Client_voiceConnections"></block>
				<block type="Client_emojis"></block>
				<block type="Client_readyTimestamp"></block>
				<block type="Client_browser"></block>
				<block type="Client_createVoiceBroadcast"></block>
				<block type="Client_login"></block>
				<block type="Client_destroy"></block>
				<block type="Client_syncGuilds"></block>
				<block type="Client_fetchUser"></block>
				<block type="Client_fetchInvite"></block>
				<block type="Client_fetchWebhook"></block>
				<block type="Client_fetchVoiceRegions"></block>
				<block type="Client_sweepMessages"></block>
				<block type="Client_fetchApplication"></block>
				<block type="Client_generateInvite"></block>
				<block type="Client_setTimeout"></block>
				<block type="Client_clearTimeout"></block>
				<block type="Client_setInterval"></block>
				<block type="Client_clearInterval"></block>
				<block type="Client_channelUpdate"></block>
				<block type="Client_guildUnavailable"></block>
				<block type="Client_emojiCreate"></block>
				<block type="Client_emojiDelete"></block>
				<block type="Client_emojiUpdate"></block>
				<block type="Client_guildMemberRemove"></block>
				<block type="Client_roleCreate"></block>
				<block type="Client_roleDelete"></block>
				<block type="Client_roleUpdate"></block>
				<block type="Client_guildUpdate"></block>
				<block type="Client_messageReactionAdd"></block>
				<block type="Client_messageReactionRemove"></block>
				<block type="Client_messageReactionRemoveAll"></block>
				<block type="Client_messageUpdate"></block>
				<block type="Client_userNoteUpdate"></block>
				<block type="Client_warn"></block>
				<block type="Client_debug"></block>
				<block type="Client_guildCreate"></block>
				<block type="Client_channelCreate"></block>
				<block type="Client_channelDelete"></block>
				<block type="Client_channelPinsUpdate"></block>
				<block type="Client_guildBanAdd"></block>
				<block type="Client_guildBanRemove"></block>
				<block type="Client_guildDelete"></block>
				<block type="Client_guildMembersChunk"></block>
				<block type="Client_message"></block>
				<block type="Client_messageDelete"></block>
				<block type="Client_messageDeleteBulk"></block>
				<block type="Client_presenceUpdate"></block>
				<block type="Client_userUpdate"></block>
				<block type="Client_guildMemberAvailable"></block>
				<block type="Client_resume"></block>
				<block type="Client_typingStart"></block>
				<block type="Client_typingStop"></block>
				<block type="Client_clientUserGuildSettingsUpdate"></block>
				<block type="Client_clientUserSettingsUpdate"></block>
				<block type="Client_voiceStateUpdate"></block>
				<block type="Client_ready"></block>
				<block type="Client_reconnecting"></block>
				<block type="Client_error"></block>
				<block type="Client_disconnect"></block>
				<block type="Client_guildMemberAdd"></block>
				<block type="Client_guildMemberUpdate"></block>
				<block type="Client_guildMemberSpeaking"></block>
			</category>
			<category name="DiscordAPIError">

				<block type="DiscordAPIError_path"></block>
				<block type="DiscordAPIError_code"></block>
			</category>
			<category name="StreamDispatcher">

				<block type="StreamDispatcher_player"></block>
				<block type="StreamDispatcher_stream"></block>
				<block type="StreamDispatcher_paused"></block>
				<block type="StreamDispatcher_destroyed"></block>
				<block type="StreamDispatcher_passes"></block>
				<block type="StreamDispatcher_time"></block>
				<block type="StreamDispatcher_totalStreamTime"></block>
				<block type="StreamDispatcher_pause"></block>
				<block type="StreamDispatcher_resume"></block>
				<block type="StreamDispatcher_end"></block>
				<block type="StreamDispatcher_setBitrate"></block>
				<block type="StreamDispatcher_speaking"></block>
				<block type="StreamDispatcher_debug"></block>
				<block type="StreamDispatcher_start"></block>
				<block type="StreamDispatcher_end"></block>
				<block type="StreamDispatcher_error"></block>
			</category>
			<category name="VoiceReceiver">

				<block type="VoiceReceiver_destroyed"></block>
				<block type="VoiceReceiver_voiceConnection"></block>
				<block type="VoiceReceiver_recreate"></block>
				<block type="VoiceReceiver_destroy"></block>
				<block type="VoiceReceiver_createOpusStream"></block>
				<block type="VoiceReceiver_createPCMStream"></block>
				<block type="VoiceReceiver_warn"></block>
				<block type="VoiceReceiver_opus"></block>
				<block type="VoiceReceiver_pcm"></block>
			</category>
			<category name="VolumeInterface">

				<block type="VolumeInterface_volume"></block>
				<block type="VolumeInterface_volumeDecibels"></block>
				<block type="VolumeInterface_volumeLogarithmic"></block>
				<block type="VolumeInterface_setVolume"></block>
				<block type="VolumeInterface_setVolumeDecibels"></block>
				<block type="VolumeInterface_setVolumeLogarithmic"></block>
				<block type="VolumeInterface_volumeChange"></block>
			</category>
			<category name="VoiceBroadcast">

				<block type="VoiceBroadcast_client"></block>
				<block type="VoiceBroadcast_prism"></block>
				<block type="VoiceBroadcast_currentTranscoder"></block>
				<block type="VoiceBroadcast_dispatchers"></block>
				<block type="VoiceBroadcast_playStream"></block>
				<block type="VoiceBroadcast_playFile"></block>
				<block type="VoiceBroadcast_playConvertedStream"></block>
				<block type="VoiceBroadcast_playOpusStream"></block>
				<block type="VoiceBroadcast_playArbitraryInput"></block>
				<block type="VoiceBroadcast_pause"></block>
				<block type="VoiceBroadcast_resume"></block>
				<block type="VoiceBroadcast_end"></block>
				<block type="VoiceBroadcast_destroy"></block>
				<block type="VoiceBroadcast_unsubscribe"></block>
				<block type="VoiceBroadcast_subscribe"></block>
				<block type="VoiceBroadcast_error"></block>
				<block type="VoiceBroadcast_warn"></block>
				<block type="VoiceBroadcast_end"></block>
			</category>
			<category name="VoiceConnection">

				<block type="VoiceConnection_voiceManager"></block>
				<block type="VoiceConnection_client"></block>
				<block type="VoiceConnection_prism"></block>
				<block type="VoiceConnection_channel"></block>
				<block type="VoiceConnection_status"></block>
				<block type="VoiceConnection_speaking"></block>
				<block type="VoiceConnection_receivers"></block>
				<block type="VoiceConnection_player"></block>
				<block type="VoiceConnection_dispatcher"></block>
				<block type="VoiceConnection_sendVoiceStateUpdate"></block>
				<block type="VoiceConnection_setTokenAndEndpoint"></block>
				<block type="VoiceConnection_setSessionID"></block>
				<block type="VoiceConnection_disconnect"></block>
				<block type="VoiceConnection_playFile"></block>
				<block type="VoiceConnection_playArbitraryInput"></block>
				<block type="VoiceConnection_playStream"></block>
				<block type="VoiceConnection_playConvertedStream"></block>
				<block type="VoiceConnection_playOpusStream"></block>
				<block type="VoiceConnection_playBroadcast"></block>
				<block type="VoiceConnection_createReceiver"></block>
				<block type="VoiceConnection_debug"></block>
				<block type="VoiceConnection_warn"></block>
				<block type="VoiceConnection_newSession"></block>
				<block type="VoiceConnection_authenticated"></block>
				<block type="VoiceConnection_failed"></block>
				<block type="VoiceConnection_reconnecting"></block>
				<block type="VoiceConnection_disconnect"></block>
				<block type="VoiceConnection_error"></block>
				<block type="VoiceConnection_ready"></block>
				<block type="VoiceConnection_speaking"></block>
			</category>
			<category name="WebhookClient">

				<block type="WebhookClient_constructor"></block>
				<block type="WebhookClient_options"></block>
				<block type="WebhookClient_client"></block>
				<block type="WebhookClient_name"></block>
				<block type="WebhookClient_token"></block>
				<block type="WebhookClient_avatar"></block>
				<block type="WebhookClient_id"></block>
				<block type="WebhookClient_guildID"></block>
				<block type="WebhookClient_channelID"></block>
				<block type="WebhookClient_owner"></block>
				<block type="WebhookClient_setTimeout"></block>
				<block type="WebhookClient_clearTimeout"></block>
				<block type="WebhookClient_setInterval"></block>
				<block type="WebhookClient_clearInterval"></block>
				<block type="WebhookClient_destroy"></block>
				<block type="WebhookClient_send"></block>
				<block type="WebhookClient_sendMessage"></block>
				<block type="WebhookClient_sendFile"></block>
				<block type="WebhookClient_sendCode"></block>
				<block type="WebhookClient_sendSlackMessage"></block>
				<block type="WebhookClient_edit"></block>
				<block type="WebhookClient_delete"></block>
			</category>
			<category name="Shard">

				<block type="Shard_constructor"></block>
				<block type="Shard_manager"></block>
				<block type="Shard_id"></block>
				<block type="Shard_env"></block>
				<block type="Shard_process"></block>
				<block type="Shard_send"></block>
				<block type="Shard_fetchClientValue"></block>
				<block type="Shard_eval"></block>
			</category>
			<category name="ShardClientUtil">

				<block type="ShardClientUtil_constructor"></block>
				<block type="ShardClientUtil_id"></block>
				<block type="ShardClientUtil_count"></block>
				<block type="ShardClientUtil_send"></block>
				<block type="ShardClientUtil_fetchClientValues"></block>
				<block type="ShardClientUtil_broadcastEval"></block>
				<block type="ShardClientUtil_singleton"></block>
			</category>
			<category name="ShardingManager">

				<block type="ShardingManager_constructor"></block>
				<block type="ShardingManager_file"></block>
				<block type="ShardingManager_totalShards"></block>
				<block type="ShardingManager_respawn"></block>
				<block type="ShardingManager_shardArgs"></block>
				<block type="ShardingManager_token"></block>
				<block type="ShardingManager_shards"></block>
				<block type="ShardingManager_createShard"></block>
				<block type="ShardingManager_spawn"></block>
				<block type="ShardingManager_broadcast"></block>
				<block type="ShardingManager_broadcastEval"></block>
				<block type="ShardingManager_fetchClientValues"></block>
				<block type="ShardingManager_message"></block>
				<block type="ShardingManager_launch"></block>
			</category>
			<category name="Attachment">

				<block type="Attachment_constructor"></block>
				<block type="Attachment_name"></block>
				<block type="Attachment_attachment"></block>
				<block type="Attachment_setAttachment"></block>
				<block type="Attachment_setFile"></block>
				<block type="Attachment_setName"></block>
			</category>
			<category name="Channel">

				<block type="Channel_client"></block>
				<block type="Channel_type"></block>
				<block type="Channel_id"></block>
				<block type="Channel_createdTimestamp"></block>
				<block type="Channel_createdAt"></block>
				<block type="Channel_delete"></block>
			</category>
			<category name="ClientUser">

				<block type="ClientUser_verified"></block>
				<block type="ClientUser_email"></block>
				<block type="ClientUser_friends"></block>
				<block type="ClientUser_blocked"></block>
				<block type="ClientUser_notes"></block>
				<block type="ClientUser_premium"></block>
				<block type="ClientUser_mfaEnabled"></block>
				<block type="ClientUser_mobile"></block>
				<block type="ClientUser_settings"></block>
				<block type="ClientUser_guildSettings"></block>
				<block type="ClientUser_client"></block>
				<block type="ClientUser_id"></block>
				<block type="ClientUser_username"></block>
				<block type="ClientUser_discriminator"></block>
				<block type="ClientUser_avatar"></block>
				<block type="ClientUser_bot"></block>
				<block type="ClientUser_lastMessageID"></block>
				<block type="ClientUser_lastMessage"></block>
				<block type="ClientUser_createdTimestamp"></block>
				<block type="ClientUser_createdAt"></block>
				<block type="ClientUser_presence"></block>
				<block type="ClientUser_avatarURL"></block>
				<block type="ClientUser_defaultAvatarURL"></block>
				<block type="ClientUser_displayAvatarURL"></block>
				<block type="ClientUser_tag"></block>
				<block type="ClientUser_note"></block>
				<block type="ClientUser_dmChannel"></block>
				<block type="ClientUser_setUsername"></block>
				<block type="ClientUser_setEmail"></block>
				<block type="ClientUser_setPassword"></block>
				<block type="ClientUser_setAvatar"></block>
				<block type="ClientUser_setPresence"></block>
				<block type="ClientUser_setStatus"></block>
				<block type="ClientUser_setGame"></block>
				<block type="ClientUser_setAFK"></block>
				<block type="ClientUser_fetchMentions"></block>
				<block type="ClientUser_addFriend"></block>
				<block type="ClientUser_removeFriend"></block>
				<block type="ClientUser_createGuild"></block>
				<block type="ClientUser_createGroupDM"></block>
				<block type="ClientUser_acceptInvite"></block>
				<block type="ClientUser_typingIn"></block>
				<block type="ClientUser_typingSinceIn"></block>
				<block type="ClientUser_typingDurationIn"></block>
				<block type="ClientUser_createDM"></block>
				<block type="ClientUser_deleteDM"></block>
				<block type="ClientUser_block"></block>
				<block type="ClientUser_unblock"></block>
				<block type="ClientUser_fetchProfile"></block>
				<block type="ClientUser_setNote"></block>
				<block type="ClientUser_equals"></block>
				<block type="ClientUser_toString"></block>
				<block type="ClientUser_send"></block>
				<block type="ClientUser_sendMessage"></block>
				<block type="ClientUser_sendEmbed"></block>
				<block type="ClientUser_sendFile"></block>
				<block type="ClientUser_sendCode"></block>
			</category>
			<category name="ClientUserChannelOverride">

				<block type="ClientUserChannelOverride_muted"></block>
				<block type="ClientUserChannelOverride_messageNotifications"></block>
			</category>
			<category name="ClientUserGuildSettings">

				<block type="ClientUserGuildSettings_client"></block>
				<block type="ClientUserGuildSettings_guildID"></block>
				<block type="ClientUserGuildSettings_mobilePush"></block>
				<block type="ClientUserGuildSettings_messageNotifications"></block>
				<block type="ClientUserGuildSettings_muted"></block>
				<block type="ClientUserGuildSettings_suppressEveryone"></block>
				<block type="ClientUserGuildSettings_channelOverrides"></block>
				<block type="ClientUserGuildSettings_update"></block>
			</category>
			<category name="ClientUserSettings">

				<block type="ClientUserSettings_convertEmoticons"></block>
				<block type="ClientUserSettings_defaultGuildsRestricted"></block>
				<block type="ClientUserSettings_detectPlatformAccounts"></block>
				<block type="ClientUserSettings_developerMode"></block>
				<block type="ClientUserSettings_enableTTSCommand"></block>
				<block type="ClientUserSettings_theme"></block>
				<block type="ClientUserSettings_status"></block>
				<block type="ClientUserSettings_showCurrentGame"></block>
				<block type="ClientUserSettings_inlineAttachmentMedia"></block>
				<block type="ClientUserSettings_inlineEmbedMedia"></block>
				<block type="ClientUserSettings_locale"></block>
				<block type="ClientUserSettings_messageDisplayCompact"></block>
				<block type="ClientUserSettings_renderReactions"></block>
				<block type="ClientUserSettings_guildPositions"></block>
				<block type="ClientUserSettings_restrictedGuilds"></block>
				<block type="ClientUserSettings_explicitContentFilter"></block>
				<block type="ClientUserSettings_friendSources"></block>
				<block type="ClientUserSettings_update"></block>
				<block type="ClientUserSettings_setGuildPosition"></block>
				<block type="ClientUserSettings_addRestrictedGuild"></block>
				<block type="ClientUserSettings_removeRestrictedGuild"></block>
			</category>
			<category name="DMChannel">

				<block type="DMChannel_recipient"></block>
				<block type="DMChannel_messages"></block>
				<block type="DMChannel_lastMessageID"></block>
				<block type="DMChannel_typing"></block>
				<block type="DMChannel_typingCount"></block>
				<block type="DMChannel_client"></block>
				<block type="DMChannel_type"></block>
				<block type="DMChannel_id"></block>
				<block type="DMChannel_createdTimestamp"></block>
				<block type="DMChannel_createdAt"></block>
				<block type="DMChannel_toString"></block>
				<block type="DMChannel_send"></block>
				<block type="DMChannel_fetchMessage"></block>
				<block type="DMChannel_fetchMessages"></block>
				<block type="DMChannel_fetchPinnedMessages"></block>
				<block type="DMChannel_search"></block>
				<block type="DMChannel_startTyping"></block>
				<block type="DMChannel_stopTyping"></block>
				<block type="DMChannel_createCollector"></block>
				<block type="DMChannel_createMessageCollector"></block>
				<block type="DMChannel_awaitMessages"></block>
				<block type="DMChannel_acknowledge"></block>
				<block type="DMChannel_sendMessage"></block>
				<block type="DMChannel_sendEmbed"></block>
				<block type="DMChannel_sendFiles"></block>
				<block type="DMChannel_sendFile"></block>
				<block type="DMChannel_sendCode"></block>
				<block type="DMChannel_delete"></block>
			</category>
			<category name="Emoji">

				<block type="Emoji_client"></block>
				<block type="Emoji_guild"></block>
				<block type="Emoji_id"></block>
				<block type="Emoji_name"></block>
				<block type="Emoji_requiresColons"></block>
				<block type="Emoji_managed"></block>
				<block type="Emoji_createdTimestamp"></block>
				<block type="Emoji_createdAt"></block>
				<block type="Emoji_roles"></block>
				<block type="Emoji_url"></block>
				<block type="Emoji_identifier"></block>
				<block type="Emoji_edit"></block>
				<block type="Emoji_setName"></block>
				<block type="Emoji_addRestrictedRole"></block>
				<block type="Emoji_addRestrictedRoles"></block>
				<block type="Emoji_removeRestrictedRole"></block>
				<block type="Emoji_removeRestrictedRoles"></block>
				<block type="Emoji_toString"></block>
				<block type="Emoji_equals"></block>
			</category>
			<category name="GroupDMChannel">

				<block type="GroupDMChannel_name"></block>
				<block type="GroupDMChannel_icon"></block>
				<block type="GroupDMChannel_ownerID"></block>
				<block type="GroupDMChannel_managed"></block>
				<block type="GroupDMChannel_applicationID"></block>
				<block type="GroupDMChannel_nicks"></block>
				<block type="GroupDMChannel_recipients"></block>
				<block type="GroupDMChannel_owner"></block>
				<block type="GroupDMChannel_iconURL"></block>
				<block type="GroupDMChannel_messages"></block>
				<block type="GroupDMChannel_lastMessageID"></block>
				<block type="GroupDMChannel_typing"></block>
				<block type="GroupDMChannel_typingCount"></block>
				<block type="GroupDMChannel_client"></block>
				<block type="GroupDMChannel_type"></block>
				<block type="GroupDMChannel_id"></block>
				<block type="GroupDMChannel_createdTimestamp"></block>
				<block type="GroupDMChannel_createdAt"></block>
				<block type="GroupDMChannel_equals"></block>
				<block type="GroupDMChannel_addUser"></block>
				<block type="GroupDMChannel_setIcon"></block>
				<block type="GroupDMChannel_setName"></block>
				<block type="GroupDMChannel_removeUser"></block>
				<block type="GroupDMChannel_toString"></block>
				<block type="GroupDMChannel_send"></block>
				<block type="GroupDMChannel_fetchMessage"></block>
				<block type="GroupDMChannel_fetchMessages"></block>
				<block type="GroupDMChannel_fetchPinnedMessages"></block>
				<block type="GroupDMChannel_search"></block>
				<block type="GroupDMChannel_startTyping"></block>
				<block type="GroupDMChannel_stopTyping"></block>
				<block type="GroupDMChannel_createCollector"></block>
				<block type="GroupDMChannel_createMessageCollector"></block>
				<block type="GroupDMChannel_awaitMessages"></block>
				<block type="GroupDMChannel_acknowledge"></block>
				<block type="GroupDMChannel_sendMessage"></block>
				<block type="GroupDMChannel_sendEmbed"></block>
				<block type="GroupDMChannel_sendFiles"></block>
				<block type="GroupDMChannel_sendFile"></block>
				<block type="GroupDMChannel_sendCode"></block>
				<block type="GroupDMChannel_delete"></block>
			</category>
			<category name="Guild">

				<block type="Guild_client"></block>
				<block type="Guild_members"></block>
				<block type="Guild_channels"></block>
				<block type="Guild_roles"></block>
				<block type="Guild_presences"></block>
				<block type="Guild_available"></block>
				<block type="Guild_id"></block>
				<block type="Guild_name"></block>
				<block type="Guild_icon"></block>
				<block type="Guild_splash"></block>
				<block type="Guild_region"></block>
				<block type="Guild_memberCount"></block>
				<block type="Guild_large"></block>
				<block type="Guild_features"></block>
				<block type="Guild_applicationID"></block>
				<block type="Guild_afkTimeout"></block>
				<block type="Guild_afkChannelID"></block>
				<block type="Guild_systemChannelID"></block>
				<block type="Guild_embedEnabled"></block>
				<block type="Guild_verificationLevel"></block>
				<block type="Guild_explicitContentFilter"></block>
				<block type="Guild_joinedTimestamp"></block>
				<block type="Guild_ownerID"></block>
				<block type="Guild_emojis"></block>
				<block type="Guild_createdTimestamp"></block>
				<block type="Guild_createdAt"></block>
				<block type="Guild_joinedAt"></block>
				<block type="Guild_iconURL"></block>
				<block type="Guild_nameAcronym"></block>
				<block type="Guild_splashURL"></block>
				<block type="Guild_owner"></block>
				<block type="Guild_afkChannel"></block>
				<block type="Guild_systemChannel"></block>
				<block type="Guild_voiceConnection"></block>
				<block type="Guild_position"></block>
				<block type="Guild_muted"></block>
				<block type="Guild_messageNotifications"></block>
				<block type="Guild_mobilePush"></block>
				<block type="Guild_suppressEveryone"></block>
				<block type="Guild_defaultRole"></block>
				<block type="Guild_me"></block>
				<block type="Guild_defaultChannel"></block>
				<block type="Guild_member"></block>
				<block type="Guild_fetchBans"></block>
				<block type="Guild_fetchInvites"></block>
				<block type="Guild_fetchWebhooks"></block>
				<block type="Guild_fetchVoiceRegions"></block>
				<block type="Guild_fetchAuditLogs"></block>
				<block type="Guild_addMember"></block>
				<block type="Guild_fetchMember"></block>
				<block type="Guild_fetchMembers"></block>
				<block type="Guild_search"></block>
				<block type="Guild_edit"></block>
				<block type="Guild_setExplicitContentFilter"></block>
				<block type="Guild_setName"></block>
				<block type="Guild_setRegion"></block>
				<block type="Guild_setVerificationLevel"></block>
				<block type="Guild_setAFKChannel"></block>
				<block type="Guild_setSystemChannel"></block>
				<block type="Guild_setAFKTimeout"></block>
				<block type="Guild_setIcon"></block>
				<block type="Guild_setOwner"></block>
				<block type="Guild_setSplash"></block>
				<block type="Guild_setPosition"></block>
				<block type="Guild_acknowledge"></block>
				<block type="Guild_allowDMs"></block>
				<block type="Guild_ban"></block>
				<block type="Guild_unban"></block>
				<block type="Guild_pruneMembers"></block>
				<block type="Guild_sync"></block>
				<block type="Guild_createChannel"></block>
				<block type="Guild_setChannelPositions"></block>
				<block type="Guild_createRole"></block>
				<block type="Guild_createEmoji"></block>
				<block type="Guild_deleteEmoji"></block>
				<block type="Guild_leave"></block>
				<block type="Guild_delete"></block>
				<block type="Guild_equals"></block>
				<block type="Guild_toString"></block>
				<block type="Guild_setRolePosition"></block>
				<block type="Guild_setChannelPosition"></block>
			</category>
			<category name="GuildAuditLogs">

				<block type="GuildAuditLogs_entries"></block>
				<block type="GuildAuditLogs_build"></block>
				<block type="GuildAuditLogs_targetType"></block>
				<block type="GuildAuditLogs_actionType"></block>
			</category>
			<category name="GuildAuditLogsEntry">

				<block type="GuildAuditLogsEntry_targetType"></block>
				<block type="GuildAuditLogsEntry_actionType"></block>
				<block type="GuildAuditLogsEntry_action"></block>
				<block type="GuildAuditLogsEntry_reason"></block>
				<block type="GuildAuditLogsEntry_executor"></block>
				<block type="GuildAuditLogsEntry_changes"></block>
				<block type="GuildAuditLogsEntry_id"></block>
				<block type="GuildAuditLogsEntry_extra"></block>
				<block type="GuildAuditLogsEntry_target"></block>
				<block type="GuildAuditLogsEntry_createdTimestamp"></block>
				<block type="GuildAuditLogsEntry_createdAt"></block>
			</category>
			<category name="GuildChannel">

				<block type="GuildChannel_guild"></block>
				<block type="GuildChannel_name"></block>
				<block type="GuildChannel_position"></block>
				<block type="GuildChannel_permissionOverwrites"></block>
				<block type="GuildChannel_calculatedPosition"></block>
				<block type="GuildChannel_deletable"></block>
				<block type="GuildChannel_muted"></block>
				<block type="GuildChannel_messageNotifications"></block>
				<block type="GuildChannel_client"></block>
				<block type="GuildChannel_type"></block>
				<block type="GuildChannel_id"></block>
				<block type="GuildChannel_createdTimestamp"></block>
				<block type="GuildChannel_createdAt"></block>
				<block type="GuildChannel_permissionsFor"></block>
				<block type="GuildChannel_overwritePermissions"></block>
				<block type="GuildChannel_edit"></block>
				<block type="GuildChannel_setName"></block>
				<block type="GuildChannel_setPosition"></block>
				<block type="GuildChannel_setTopic"></block>
				<block type="GuildChannel_createInvite"></block>
				<block type="GuildChannel_clone"></block>
				<block type="GuildChannel_delete"></block>
				<block type="GuildChannel_equals"></block>
				<block type="GuildChannel_toString"></block>
			</category>
			<category name="GuildMember">

				<block type="GuildMember_client"></block>
				<block type="GuildMember_guild"></block>
				<block type="GuildMember_user"></block>
				<block type="GuildMember_lastMessageID"></block>
				<block type="GuildMember_lastMessage"></block>
				<block type="GuildMember_serverDeaf"></block>
				<block type="GuildMember_serverMute"></block>
				<block type="GuildMember_selfMute"></block>
				<block type="GuildMember_selfDeaf"></block>
				<block type="GuildMember_voiceSessionID"></block>
				<block type="GuildMember_voiceChannelID"></block>
				<block type="GuildMember_speaking"></block>
				<block type="GuildMember_nickname"></block>
				<block type="GuildMember_joinedTimestamp"></block>
				<block type="GuildMember_joinedAt"></block>
				<block type="GuildMember_presence"></block>
				<block type="GuildMember_roles"></block>
				<block type="GuildMember_highestRole"></block>
				<block type="GuildMember_colorRole"></block>
				<block type="GuildMember_displayColor"></block>
				<block type="GuildMember_displayHexColor"></block>
				<block type="GuildMember_hoistRole"></block>
				<block type="GuildMember_mute"></block>
				<block type="GuildMember_deaf"></block>
				<block type="GuildMember_voiceChannel"></block>
				<block type="GuildMember_id"></block>
				<block type="GuildMember_displayName"></block>
				<block type="GuildMember_permissions"></block>
				<block type="GuildMember_kickable"></block>
				<block type="GuildMember_bannable"></block>
				<block type="GuildMember_permissionsIn"></block>
				<block type="GuildMember_hasPermission"></block>
				<block type="GuildMember_hasPermissions"></block>
				<block type="GuildMember_missingPermissions"></block>
				<block type="GuildMember_edit"></block>
				<block type="GuildMember_setMute"></block>
				<block type="GuildMember_setDeaf"></block>
				<block type="GuildMember_setVoiceChannel"></block>
				<block type="GuildMember_setRoles"></block>
				<block type="GuildMember_addRole"></block>
				<block type="GuildMember_addRoles"></block>
				<block type="GuildMember_removeRole"></block>
				<block type="GuildMember_removeRoles"></block>
				<block type="GuildMember_setNickname"></block>
				<block type="GuildMember_createDM"></block>
				<block type="GuildMember_deleteDM"></block>
				<block type="GuildMember_kick"></block>
				<block type="GuildMember_ban"></block>
				<block type="GuildMember_toString"></block>
				<block type="GuildMember_send"></block>
				<block type="GuildMember_sendMessage"></block>
				<block type="GuildMember_sendEmbed"></block>
				<block type="GuildMember_sendFile"></block>
				<block type="GuildMember_sendCode"></block>
			</category>
			<category name="Collector">

				<block type="Collector_client"></block>
				<block type="Collector_filter"></block>
				<block type="Collector_options"></block>
				<block type="Collector_collected"></block>
				<block type="Collector_ended"></block>
				<block type="Collector_next"></block>
				<block type="Collector_stop"></block>
				<block type="Collector_handle"></block>
				<block type="Collector_postCheck"></block>
				<block type="Collector_cleanup"></block>
				<block type="Collector_collect"></block>
				<block type="Collector_end"></block>
			</category>
			<category name="Invite">

				<block type="Invite_client"></block>
				<block type="Invite_guild"></block>
				<block type="Invite_code"></block>
				<block type="Invite_presenceCount"></block>
				<block type="Invite_memberCount"></block>
				<block type="Invite_textChannelCount"></block>
				<block type="Invite_voiceChannelCount"></block>
				<block type="Invite_temporary"></block>
				<block type="Invite_maxAge"></block>
				<block type="Invite_uses"></block>
				<block type="Invite_maxUses"></block>
				<block type="Invite_inviter"></block>
				<block type="Invite_channel"></block>
				<block type="Invite_createdTimestamp"></block>
				<block type="Invite_createdAt"></block>
				<block type="Invite_expiresTimestamp"></block>
				<block type="Invite_expiresAt"></block>
				<block type="Invite_url"></block>
				<block type="Invite_delete"></block>
				<block type="Invite_toString"></block>
			</category>
			<category name="Message">

				<block type="Message_client"></block>
				<block type="Message_channel"></block>
				<block type="Message_id"></block>
				<block type="Message_type"></block>
				<block type="Message_content"></block>
				<block type="Message_author"></block>
				<block type="Message_member"></block>
				<block type="Message_pinned"></block>
				<block type="Message_tts"></block>
				<block type="Message_nonce"></block>
				<block type="Message_system"></block>
				<block type="Message_embeds"></block>
				<block type="Message_attachments"></block>
				<block type="Message_createdTimestamp"></block>
				<block type="Message_editedTimestamp"></block>
				<block type="Message_reactions"></block>
				<block type="Message_mentions"></block>
				<block type="Message_webhookID"></block>
				<block type="Message_hit"></block>
				<block type="Message_createdAt"></block>
				<block type="Message_editedAt"></block>
				<block type="Message_guild"></block>
				<block type="Message_cleanContent"></block>
				<block type="Message_edits"></block>
				<block type="Message_editable"></block>
				<block type="Message_deletable"></block>
				<block type="Message_pinnable"></block>
				<block type="Message_createReactionCollector"></block>
				<block type="Message_awaitReactions"></block>
				<block type="Message_isMentioned"></block>
				<block type="Message_isMemberMentioned"></block>
				<block type="Message_edit"></block>
				<block type="Message_editCode"></block>
				<block type="Message_pin"></block>
				<block type="Message_unpin"></block>
				<block type="Message_react"></block>
				<block type="Message_clearReactions"></block>
				<block type="Message_delete"></block>
				<block type="Message_reply"></block>
				<block type="Message_acknowledge"></block>
				<block type="Message_fetchWebhook"></block>
				<block type="Message_equals"></block>
				<block type="Message_toString"></block>
			</category>
			<category name="MessageAttachment">

				<block type="MessageAttachment_client"></block>
				<block type="MessageAttachment_message"></block>
				<block type="MessageAttachment_id"></block>
				<block type="MessageAttachment_filename"></block>
				<block type="MessageAttachment_filesize"></block>
				<block type="MessageAttachment_url"></block>
				<block type="MessageAttachment_proxyURL"></block>
				<block type="MessageAttachment_height"></block>
				<block type="MessageAttachment_width"></block>
			</category>
			<category name="MessageCollector">

				<block type="MessageCollector_constructor"></block>
				<block type="MessageCollector_channel"></block>
				<block type="MessageCollector_received"></block>
				<block type="MessageCollector_client"></block>
				<block type="MessageCollector_filter"></block>
				<block type="MessageCollector_options"></block>
				<block type="MessageCollector_collected"></block>
				<block type="MessageCollector_ended"></block>
				<block type="MessageCollector_next"></block>
				<block type="MessageCollector_stop"></block>
				<block type="MessageCollector_message"></block>
				<block type="MessageCollector_collect"></block>
				<block type="MessageCollector_end"></block>
			</category>
			<category name="MessageEmbed">

				<block type="MessageEmbed_client"></block>
				<block type="MessageEmbed_message"></block>
				<block type="MessageEmbed_type"></block>
				<block type="MessageEmbed_title"></block>
				<block type="MessageEmbed_description"></block>
				<block type="MessageEmbed_url"></block>
				<block type="MessageEmbed_color"></block>
				<block type="MessageEmbed_fields"></block>
				<block type="MessageEmbed_createdTimestamp"></block>
				<block type="MessageEmbed_thumbnail"></block>
				<block type="MessageEmbed_image"></block>
				<block type="MessageEmbed_video"></block>
				<block type="MessageEmbed_author"></block>
				<block type="MessageEmbed_provider"></block>
				<block type="MessageEmbed_footer"></block>
				<block type="MessageEmbed_createdAt"></block>
				<block type="MessageEmbed_hexColor"></block>
			</category>
			<category name="MessageEmbedThumbnail">

				<block type="MessageEmbedThumbnail_embed"></block>
				<block type="MessageEmbedThumbnail_url"></block>
				<block type="MessageEmbedThumbnail_proxyURL"></block>
				<block type="MessageEmbedThumbnail_height"></block>
				<block type="MessageEmbedThumbnail_width"></block>
			</category>
			<category name="MessageEmbedImage">

				<block type="MessageEmbedImage_embed"></block>
				<block type="MessageEmbedImage_url"></block>
				<block type="MessageEmbedImage_proxyURL"></block>
				<block type="MessageEmbedImage_height"></block>
				<block type="MessageEmbedImage_width"></block>
			</category>
			<category name="MessageEmbedVideo">

				<block type="MessageEmbedVideo_embed"></block>
				<block type="MessageEmbedVideo_url"></block>
				<block type="MessageEmbedVideo_height"></block>
				<block type="MessageEmbedVideo_width"></block>
			</category>
			<category name="MessageEmbedProvider">

				<block type="MessageEmbedProvider_embed"></block>
				<block type="MessageEmbedProvider_name"></block>
				<block type="MessageEmbedProvider_url"></block>
			</category>
			<category name="MessageEmbedAuthor">

				<block type="MessageEmbedAuthor_embed"></block>
				<block type="MessageEmbedAuthor_name"></block>
				<block type="MessageEmbedAuthor_url"></block>
				<block type="MessageEmbedAuthor_iconURL"></block>
			</category>
			<category name="MessageEmbedField">

				<block type="MessageEmbedField_embed"></block>
				<block type="MessageEmbedField_name"></block>
				<block type="MessageEmbedField_value"></block>
				<block type="MessageEmbedField_inline"></block>
			</category>
			<category name="MessageEmbedFooter">

				<block type="MessageEmbedFooter_embed"></block>
				<block type="MessageEmbedFooter_text"></block>
				<block type="MessageEmbedFooter_iconURL"></block>
				<block type="MessageEmbedFooter_proxyIconUrl"></block>
			</category>
			<category name="MessageMentions">

				<block type="MessageMentions_everyone"></block>
				<block type="MessageMentions_users"></block>
				<block type="MessageMentions_roles"></block>
				<block type="MessageMentions_members"></block>
				<block type="MessageMentions_channels"></block>
				<block type="MessageMentions_EVERYONE_PATTERN"></block>
				<block type="MessageMentions_USERS_PATTERN"></block>
				<block type="MessageMentions_ROLES_PATTERN"></block>
				<block type="MessageMentions_CHANNELS_PATTERN"></block>
			</category>
			<category name="MessageReaction">

				<block type="MessageReaction_message"></block>
				<block type="MessageReaction_me"></block>
				<block type="MessageReaction_count"></block>
				<block type="MessageReaction_users"></block>
				<block type="MessageReaction_emoji"></block>
				<block type="MessageReaction_remove"></block>
				<block type="MessageReaction_fetchUsers"></block>
			</category>
			<category name="OAuth2Application">

				<block type="OAuth2Application_client"></block>
				<block type="OAuth2Application_id"></block>
				<block type="OAuth2Application_name"></block>
				<block type="OAuth2Application_description"></block>
				<block type="OAuth2Application_icon"></block>
				<block type="OAuth2Application_iconURL"></block>
				<block type="OAuth2Application_rpcOrigins"></block>
				<block type="OAuth2Application_redirectURIs"></block>
				<block type="OAuth2Application_botRequireCodeGrant"></block>
				<block type="OAuth2Application_botPublic"></block>
				<block type="OAuth2Application_rpcApplicationState"></block>
				<block type="OAuth2Application_bot"></block>
				<block type="OAuth2Application_flags"></block>
				<block type="OAuth2Application_secret"></block>
				<block type="OAuth2Application_owner"></block>
				<block type="OAuth2Application_createdTimestamp"></block>
				<block type="OAuth2Application_createdAt"></block>
				<block type="OAuth2Application_reset"></block>
				<block type="OAuth2Application_toString"></block>
			</category>
			<category name="PartialGuild">

				<block type="PartialGuild_client"></block>
				<block type="PartialGuild_id"></block>
				<block type="PartialGuild_name"></block>
				<block type="PartialGuild_icon"></block>
				<block type="PartialGuild_splash"></block>
			</category>
			<category name="PartialGuildChannel">

				<block type="PartialGuildChannel_client"></block>
				<block type="PartialGuildChannel_id"></block>
				<block type="PartialGuildChannel_name"></block>
				<block type="PartialGuildChannel_type"></block>
			</category>
			<category name="PermissionOverwrites">

				<block type="PermissionOverwrites_channel"></block>
				<block type="PermissionOverwrites_id"></block>
				<block type="PermissionOverwrites_type"></block>
				<block type="PermissionOverwrites_delete"></block>
			</category>
			<category name="Presence">

				<block type="Presence_status"></block>
				<block type="Presence_game"></block>
				<block type="Presence_equals"></block>
			</category>
			<category name="Game">

				<block type="Game_name"></block>
				<block type="Game_type"></block>
				<block type="Game_url"></block>
				<block type="Game_streaming"></block>
				<block type="Game_equals"></block>
			</category>
			<category name="ReactionCollector">

				<block type="ReactionCollector_constructor"></block>
				<block type="ReactionCollector_message"></block>
				<block type="ReactionCollector_users"></block>
				<block type="ReactionCollector_total"></block>
				<block type="ReactionCollector_client"></block>
				<block type="ReactionCollector_filter"></block>
				<block type="ReactionCollector_options"></block>
				<block type="ReactionCollector_collected"></block>
				<block type="ReactionCollector_ended"></block>
				<block type="ReactionCollector_next"></block>
				<block type="ReactionCollector_stop"></block>
				<block type="ReactionCollector_collect"></block>
				<block type="ReactionCollector_end"></block>
			</category>
			<category name="ReactionEmoji">

				<block type="ReactionEmoji_reaction"></block>
				<block type="ReactionEmoji_name"></block>
				<block type="ReactionEmoji_id"></block>
				<block type="ReactionEmoji_identifier"></block>
				<block type="ReactionEmoji_toString"></block>
			</category>
			<category name="RichEmbed">

				<block type="RichEmbed_constructor"></block>
				<block type="RichEmbed_title"></block>
				<block type="RichEmbed_description"></block>
				<block type="RichEmbed_url"></block>
				<block type="RichEmbed_color"></block>
				<block type="RichEmbed_author"></block>
				<block type="RichEmbed_timestamp"></block>
				<block type="RichEmbed_fields"></block>
				<block type="RichEmbed_thumbnail"></block>
				<block type="RichEmbed_image"></block>
				<block type="RichEmbed_footer"></block>
				<block type="RichEmbed_file"></block>
				<block type="RichEmbed_setTitle"></block>
				<block type="RichEmbed_setDescription"></block>
				<block type="RichEmbed_setURL"></block>
				<block type="RichEmbed_setColor"></block>
				<block type="RichEmbed_setAuthor"></block>
				<block type="RichEmbed_setTimestamp"></block>
				<block type="RichEmbed_addField"></block>
				<block type="RichEmbed_addBlankField"></block>
				<block type="RichEmbed_setThumbnail"></block>
				<block type="RichEmbed_setImage"></block>
				<block type="RichEmbed_setFooter"></block>
				<block type="RichEmbed_attachFile"></block>
			</category>
			<category name="Role">

				<block type="Role_client"></block>
				<block type="Role_guild"></block>
				<block type="Role_id"></block>
				<block type="Role_name"></block>
				<block type="Role_color"></block>
				<block type="Role_hoist"></block>
				<block type="Role_position"></block>
				<block type="Role_permissions"></block>
				<block type="Role_managed"></block>
				<block type="Role_mentionable"></block>
				<block type="Role_createdTimestamp"></block>
				<block type="Role_createdAt"></block>
				<block type="Role_hexColor"></block>
				<block type="Role_members"></block>
				<block type="Role_editable"></block>
				<block type="Role_calculatedPosition"></block>
				<block type="Role_serialize"></block>
				<block type="Role_hasPermission"></block>
				<block type="Role_hasPermissions"></block>
				<block type="Role_comparePositionTo"></block>
				<block type="Role_edit"></block>
				<block type="Role_setName"></block>
				<block type="Role_setColor"></block>
				<block type="Role_setHoist"></block>
				<block type="Role_setPosition"></block>
				<block type="Role_setPermissions"></block>
				<block type="Role_setMentionable"></block>
				<block type="Role_delete"></block>
				<block type="Role_equals"></block>
				<block type="Role_toString"></block>
				<block type="Role_comparePositions"></block>
			</category>
			<category name="TextChannel">

				<block type="TextChannel_topic"></block>
				<block type="TextChannel_nsfw"></block>
				<block type="TextChannel_members"></block>
				<block type="TextChannel_messages"></block>
				<block type="TextChannel_lastMessageID"></block>
				<block type="TextChannel_typing"></block>
				<block type="TextChannel_typingCount"></block>
				<block type="TextChannel_guild"></block>
				<block type="TextChannel_name"></block>
				<block type="TextChannel_position"></block>
				<block type="TextChannel_permissionOverwrites"></block>
				<block type="TextChannel_calculatedPosition"></block>
				<block type="TextChannel_deletable"></block>
				<block type="TextChannel_muted"></block>
				<block type="TextChannel_messageNotifications"></block>
				<block type="TextChannel_fetchWebhooks"></block>
				<block type="TextChannel_createWebhook"></block>
				<block type="TextChannel_send"></block>
				<block type="TextChannel_fetchMessage"></block>
				<block type="TextChannel_fetchMessages"></block>
				<block type="TextChannel_fetchPinnedMessages"></block>
				<block type="TextChannel_search"></block>
				<block type="TextChannel_startTyping"></block>
				<block type="TextChannel_stopTyping"></block>
				<block type="TextChannel_createCollector"></block>
				<block type="TextChannel_createMessageCollector"></block>
				<block type="TextChannel_awaitMessages"></block>
				<block type="TextChannel_bulkDelete"></block>
				<block type="TextChannel_acknowledge"></block>
				<block type="TextChannel_sendMessage"></block>
				<block type="TextChannel_sendEmbed"></block>
				<block type="TextChannel_sendFiles"></block>
				<block type="TextChannel_sendFile"></block>
				<block type="TextChannel_sendCode"></block>
				<block type="TextChannel_permissionsFor"></block>
				<block type="TextChannel_overwritePermissions"></block>
				<block type="TextChannel_edit"></block>
				<block type="TextChannel_setName"></block>
				<block type="TextChannel_setPosition"></block>
				<block type="TextChannel_setTopic"></block>
				<block type="TextChannel_createInvite"></block>
				<block type="TextChannel_clone"></block>
				<block type="TextChannel_delete"></block>
				<block type="TextChannel_equals"></block>
				<block type="TextChannel_toString"></block>
			</category>
			<category name="User">

				<block type="User_client"></block>
				<block type="User_id"></block>
				<block type="User_username"></block>
				<block type="User_discriminator"></block>
				<block type="User_avatar"></block>
				<block type="User_bot"></block>
				<block type="User_lastMessageID"></block>
				<block type="User_lastMessage"></block>
				<block type="User_createdTimestamp"></block>
				<block type="User_createdAt"></block>
				<block type="User_presence"></block>
				<block type="User_avatarURL"></block>
				<block type="User_defaultAvatarURL"></block>
				<block type="User_displayAvatarURL"></block>
				<block type="User_tag"></block>
				<block type="User_note"></block>
				<block type="User_dmChannel"></block>
				<block type="User_typingIn"></block>
				<block type="User_typingSinceIn"></block>
				<block type="User_typingDurationIn"></block>
				<block type="User_createDM"></block>
				<block type="User_deleteDM"></block>
				<block type="User_addFriend"></block>
				<block type="User_removeFriend"></block>
				<block type="User_block"></block>
				<block type="User_unblock"></block>
				<block type="User_fetchProfile"></block>
				<block type="User_setNote"></block>
				<block type="User_equals"></block>
				<block type="User_toString"></block>
				<block type="User_send"></block>
				<block type="User_sendMessage"></block>
				<block type="User_sendEmbed"></block>
				<block type="User_sendFile"></block>
				<block type="User_sendCode"></block>
			</category>
			<category name="UserConnection">

				<block type="UserConnection_user"></block>
				<block type="UserConnection_type"></block>
				<block type="UserConnection_name"></block>
				<block type="UserConnection_id"></block>
				<block type="UserConnection_revoked"></block>
				<block type="UserConnection_integrations"></block>
			</category>
			<category name="UserProfile">

				<block type="UserProfile_user"></block>
				<block type="UserProfile_client"></block>
				<block type="UserProfile_mutualGuilds"></block>
				<block type="UserProfile_connections"></block>
				<block type="UserProfile_premium"></block>
				<block type="UserProfile_premiumSince"></block>
			</category>
			<category name="VoiceChannel">

				<block type="VoiceChannel_members"></block>
				<block type="VoiceChannel_bitrate"></block>
				<block type="VoiceChannel_userLimit"></block>
				<block type="VoiceChannel_connection"></block>
				<block type="VoiceChannel_full"></block>
				<block type="VoiceChannel_joinable"></block>
				<block type="VoiceChannel_speakable"></block>
				<block type="VoiceChannel_guild"></block>
				<block type="VoiceChannel_name"></block>
				<block type="VoiceChannel_position"></block>
				<block type="VoiceChannel_permissionOverwrites"></block>
				<block type="VoiceChannel_calculatedPosition"></block>
				<block type="VoiceChannel_deletable"></block>
				<block type="VoiceChannel_muted"></block>
				<block type="VoiceChannel_messageNotifications"></block>
				<block type="VoiceChannel_setBitrate"></block>
				<block type="VoiceChannel_setUserLimit"></block>
				<block type="VoiceChannel_join"></block>
				<block type="VoiceChannel_leave"></block>
				<block type="VoiceChannel_permissionsFor"></block>
				<block type="VoiceChannel_overwritePermissions"></block>
				<block type="VoiceChannel_edit"></block>
				<block type="VoiceChannel_setName"></block>
				<block type="VoiceChannel_setPosition"></block>
				<block type="VoiceChannel_setTopic"></block>
				<block type="VoiceChannel_createInvite"></block>
				<block type="VoiceChannel_clone"></block>
				<block type="VoiceChannel_delete"></block>
				<block type="VoiceChannel_equals"></block>
				<block type="VoiceChannel_toString"></block>
			</category>
			<category name="VoiceRegion">

				<block type="VoiceRegion_id"></block>
				<block type="VoiceRegion_name"></block>
				<block type="VoiceRegion_vip"></block>
				<block type="VoiceRegion_deprecated"></block>
				<block type="VoiceRegion_optimal"></block>
				<block type="VoiceRegion_custom"></block>
				<block type="VoiceRegion_sampleHostname"></block>
			</category>
			<category name="Webhook">

				<block type="Webhook_client"></block>
				<block type="Webhook_name"></block>
				<block type="Webhook_token"></block>
				<block type="Webhook_avatar"></block>
				<block type="Webhook_id"></block>
				<block type="Webhook_guildID"></block>
				<block type="Webhook_channelID"></block>
				<block type="Webhook_owner"></block>
				<block type="Webhook_send"></block>
				<block type="Webhook_sendMessage"></block>
				<block type="Webhook_sendFile"></block>
				<block type="Webhook_sendCode"></block>
				<block type="Webhook_sendSlackMessage"></block>
				<block type="Webhook_edit"></block>
				<block type="Webhook_delete"></block>
			</category>
			<category name="Collection">

				<block type="Collection_array"></block>
				<block type="Collection_keyArray"></block>
				<block type="Collection_first"></block>
				<block type="Collection_firstKey"></block>
				<block type="Collection_last"></block>
				<block type="Collection_lastKey"></block>
				<block type="Collection_random"></block>
				<block type="Collection_randomKey"></block>
				<block type="Collection_findAll"></block>
				<block type="Collection_find"></block>
				<block type="Collection_findKey"></block>
				<block type="Collection_exists"></block>
				<block type="Collection_filter"></block>
				<block type="Collection_filterArray"></block>
				<block type="Collection_map"></block>
				<block type="Collection_some"></block>
				<block type="Collection_every"></block>
				<block type="Collection_reduce"></block>
				<block type="Collection_clone"></block>
				<block type="Collection_concat"></block>
				<block type="Collection_deleteAll"></block>
				<block type="Collection_equals"></block>
				<block type="Collection_sort"></block>
			</category>
			<category name="Permissions">

				<block type="Permissions_constructor"></block>
				<block type="Permissions__member"></block>
				<block type="Permissions_bitfield"></block>
				<block type="Permissions_raw"></block>
				<block type="Permissions_FLAGS"></block>
				<block type="Permissions_ALL"></block>
				<block type="Permissions_DEFAULT"></block>
				<block type="Permissions_has"></block>
				<block type="Permissions_missing"></block>
				<block type="Permissions_add"></block>
				<block type="Permissions_remove"></block>
				<block type="Permissions_serialize"></block>
				<block type="Permissions_hasPermission"></block>
				<block type="Permissions_hasPermissions"></block>
				<block type="Permissions_missingPermissions"></block>
				<block type="Permissions_resolve"></block>
			</category>
			<category name="EvaluatedPermissions"></category>
			<category name="SnowflakeUtil">

				<block type="SnowflakeUtil_generate"></block>
				<block type="SnowflakeUtil_deconstruct"></block>
			</category>
			<category name="Util">

				<block type="Util_splitMessage"></block>
				<block type="Util_escapeMarkdown"></block>
				<block type="Util_fetchRecommendedShards"></block>
			</category>
		</xml>
	</div>


</body></html>
	init() {
		this.appendValueInput('${c.name}')
			.setCheck(null)
			.appendField('with');
		this.appendDummyInput()
			.appendField('${method.name}${temp.with}');${temp.blockInputs}
		this.setInputsInline(true);${temp.blockReturn}
		this.setColour(${colour.method});
		this.setTooltip('${escapeTooltip(method.description)}');
		this.setHelpUrl('${url}class/${c.name}?scrollTo=${method.name}');
	}
};

Blockly.JavaScript.${c.name}_${method.name} = (block) => {
	const ${c.name} = Blockly.JavaScript.valueToCode(block, '${c.name}', Blockly.JavaScript.ORDER_ATOMIC);${temp.codeInputs}
	const code = \`\${${c.name}}.${method.name}(${temp.codeAttributes})${temp.codeNewLine}\`;
	return ${temp.codeReturn};
};
`;
					currclass.block.push({
						'@': {
							type: `${c.name}_${method.name}`
						},
						'#': ''
					});
				});
		}

		// Events
		if (c.events) {
			c.events.filter(property => property.access !== 'private')
				.forEach((event) => {
					temp.with = '';
					temp.blockInputs = '';
					temp.codeInputs = '';
					temp.codeAttributes = '';
					temp.params = event.params ? event.params.filter(current => !current.name.includes('.')) : [];

					if (temp.params.length) {
						// Add the word "with" for the block
						temp.with = ' with';
						temp.params.forEach((parameter) => {
							// Inputs for the block definition
							temp.blockInputs += `
			.appendField(new Blockly.FieldVariable('${parameter.name}'), '${parameter.name}')`;

							// Inputs for the code generator
							temp.codeInputs += `
	const ${parameter.name} = block.getFieldValue('${parameter.name}');`;
						});
						temp.codeAttributes = temp.params.map(parameter => `\${${parameter.name}}`).join();
					}

					code += `
Blockly.Blocks.${c.name}_${event.name} = {
	init() {
		this.appendValueInput('${c.name}')
			.setCheck(null)
			.appendField('when');
		this.appendDummyInput()
			.appendField('emits ${event.name}')${temp.blockInputs};
		this.appendStatementInput('function')
			.setCheck(null);
		this.setInputsInline(true);
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(${colour.event});
		this.setTooltip('${escapeTooltip(event.description)}');
		this.setHelpUrl('${url}class/${c.name}?scrollTo=${event.name}');
	}
};

Blockly.JavaScript.${c.name}_${event.name} = (block) => {
	const ${c.name} = Blockly.JavaScript.valueToCode(block, '${c.name}', Blockly.JavaScript.ORDER_ATOMIC);${temp.codeInputs}
	const statementsFunction = Blockly.JavaScript.statementToCode(block, 'function');
	const code = \`\${${c.name}}.on('${event.name}', (${temp.codeAttributes}) => {\${statementsFunction}});\\n\`;
	return code;
};
`;
					currclass.block.push({
						'@': {
							type: `${c.name}_${event.name}`
						},
						'#': ''
					});
				});
		}

		xml.category.push(currclass);
	}
});

fs.writeFile('./files/xml/toolbox.xml', js2xmlparser.parse('xml', xml, {
	format: {
		doubleQuotes: true,
		indent: '\t',
		newline: '\n',
		pretty: true
	}
}), (err) => {
	if (err) {
		console.dir(err);
	} else {
		console.log('toolbox saved!');
	}
});

fs.writeFileSync('./files/js/discordblocks/blocks.js', code);

